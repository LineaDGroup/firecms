import * as React from "react";
import { useMemo } from "react";

import { Entity, EntityCollection, ResolvedProperty } from "../types";

import {
    getEntityImagePreviewPropertyKey,
    getEntityPreviewKeys,
    getEntityTitlePropertyKey,
    getValueInPath,
    IconForView,
    resolveCollection
} from "../util";
import { cls, defaultBorderMixin, IconButton, KeyboardTabIcon, Skeleton, Tooltip, Typography } from "@firecms/ui";
import { PreviewSize, PropertyPreview, SkeletonPropertyComponent } from "../preview";
import {
    useAuthController,
    useCustomizationController,
    useNavigationController,
    useSideEntityController
} from "../hooks";
import { useAnalyticsController } from "../hooks/useAnalyticsController";

export type EntityPreviewProps = {
    size: PreviewSize,
    actions?: React.ReactNode,
    collection?: EntityCollection,
    hover?: boolean;
    previewProperties?: string[],
    disabled?: boolean,
    entity: Entity<any>,
    includeId?: boolean,
    includeEntityLink?: boolean,
    onClick?: (e: React.SyntheticEvent) => void;
};

/**
 * This view is used to display a preview of an entity.
 * It is used by default in reference fields and whenever a reference is displayed.
 */
export function EntityPreview({
                                  actions,
                                  disabled,
                                  hover,
                                  collection: collectionProp,
                                  previewProperties,
                                  onClick,
                                  size,
                                  includeId = true,
                                  includeEntityLink = true,
                                  entity
                              }: EntityPreviewProps) {

    const authController = useAuthController();
    const analyticsController = useAnalyticsController();
    const sideEntityController = useSideEntityController();
    const customizationController = useCustomizationController();

    const navigationController = useNavigationController();

    const collection = collectionProp ?? navigationController.getCollection(entity.path);

    if (!collection) {
        throw Error(`Couldn't find the corresponding collection view for the path: ${entity.path}`);
    }

    const resolvedCollection = React.useMemo(() => resolveCollection({
        collection,
        path: entity.path,
        values: entity.values,
        propertyConfigs: customizationController.propertyConfigs,
        authController
    }), [collection]);

    const listProperties = useMemo(() => getEntityPreviewKeys(authController, resolvedCollection, customizationController.propertyConfigs, previewProperties, size === "medium" || size === "large" ? 3 : 1),
        [previewProperties, resolvedCollection, size]);

    const titleProperty = getEntityTitlePropertyKey(resolvedCollection, customizationController.propertyConfigs);
    const imagePropertyKey = getEntityImagePreviewPropertyKey(resolvedCollection);
    const imageProperty = imagePropertyKey ? resolvedCollection.properties[imagePropertyKey] : undefined;
    const usedImageProperty = imageProperty && "of" in imageProperty ? imageProperty.of : imageProperty;
    const restProperties = listProperties.filter(p => p !== titleProperty && p !== imagePropertyKey);

    const imageValue = imagePropertyKey ? getValueInPath(entity.values, imagePropertyKey) : undefined;
    const usedImageValue = imageProperty !== undefined ? ("of" in imageProperty
            ? ((imageValue ?? []).length > 0
                ? imageValue[0] : undefined)
            : imageValue)
        : undefined;

    return <EntityPreviewContainer onClick={disabled ? undefined : onClick}
                                   hover={disabled ? undefined : hover}
                                   size={size}>
        <div className={cls("flex w-10 h-10 ml-1 mr-2 shrink-0", size === "small" ? "my-0.5" : "m-2 self-start")}>
            {usedImageProperty && usedImageValue && <PropertyPreview property={usedImageProperty}
                                                                     propertyKey={imagePropertyKey as string}
                                                                     size={"small"}
                                                                     value={usedImageValue}/>}
            {(!usedImageProperty || !usedImageValue) && <IconForView collectionOrView={collection}
                                                                     color={"primary"}
                                                                     size={size}
                                                                     className={"m-auto p-1"}/>}
        </div>


        <div className={"flex flex-col grow-1 w-full m-1 shrink-1"} style={{
            "maxWidth": "calc(100% - 96px)"
        }}>

            {size !== "small" && includeId && (
                entity
                    ? <div className={"block whitespace-nowrap overflow-hidden truncate"}>
                        <Typography variant={"caption"}
                                    color={"disabled"}
                                    className={"font-mono"}>
                            {entity.id}
                        </Typography>
                    </div>
                    : <Skeleton/>)}

            {titleProperty && (
                <div className={"truncate my-0.5 text-sm font-medium"}>
                    {
                        entity
                            ? <PropertyPreview
                                propertyKey={titleProperty as string}
                                value={getValueInPath(entity.values, titleProperty)}
                                property={resolvedCollection.properties[titleProperty as string] as ResolvedProperty}
                                size={"large"}/>
                            : <SkeletonPropertyComponent
                                property={resolvedCollection.properties[titleProperty as string] as ResolvedProperty}
                                size={"large"}/>
                    }
                </div>
            )}

            {restProperties && restProperties.map((key) => {
                const childProperty = resolvedCollection.properties[key as string];
                if (!childProperty) return null;

                return (
                    <div key={"ref_prev_" + key}
                         className={cls("truncate", restProperties.length > 1 ? "my-0.5" : "my-0")}>
                        {
                            entity
                                ? <PropertyPreview
                                    propertyKey={key as string}
                                    value={getValueInPath(entity.values, key)}
                                    property={childProperty as ResolvedProperty}
                                    size={"small"}/>
                                : <SkeletonPropertyComponent
                                    property={childProperty as ResolvedProperty}
                                    size={"small"}/>
                        }
                    </div>
                );
            })}

        </div>

        {entity && includeEntityLink &&
            <Tooltip title={`See details for ${entity.id}`} className={"shrink-0"}>
                <IconButton
                    color={"inherit"}
                    size={"medium"}
                    className={size !== "small" ? "self-start" : ""}
                    onClick={(e) => {
                        e.stopPropagation();
                        analyticsController.onAnalyticsEvent?.("entity_click_from_reference", {
                            path: entity.path,
                            entityId: entity.id
                        });
                        sideEntityController.open({
                            entityId: entity.id,
                            path: entity.path,
                            collection,
                            updateUrl: true
                        });
                    }}>
                    <KeyboardTabIcon size={"medium"}/>
                </IconButton>
            </Tooltip>}

        {actions}

    </EntityPreviewContainer>;
}

export type EntityPreviewContainerProps = {
    children: React.ReactNode;
    hover?: boolean;
    fullwidth?: boolean;
    size: PreviewSize;
    className?: string;
    style?: React.CSSProperties;
    onClick?: (e: React.SyntheticEvent) => void;
};

export const EntityPreviewContainer = React.forwardRef<HTMLDivElement, EntityPreviewContainerProps>(({
                                                                                                         children,
                                                                                                         hover,
                                                                                                         onClick,
                                                                                                         size,
                                                                                                         style,
                                                                                                         className,
                                                                                                         fullwidth = true,
                                                                                                         ...props
                                                                                                     }, ref) => {
    return <div
        ref={ref}
        style={{
            ...style,
            // @ts-ignore
            tabindex: 0
        }}
        className={cls(
            "bg-white dark:bg-surface-900",
            "min-h-[42px]",
            fullwidth ? "w-full" : "",
            "items-center",
            hover ? "hover:bg-surface-accent-50 dark:hover:bg-surface-800 group-hover:bg-surface-accent-50 dark:group-hover:bg-surface-800" : "",
            size === "small" ? "p-1" : "px-2 py-1",
            "flex border rounded-lg",
            onClick ? "cursor-pointer" : "",
            defaultBorderMixin,
            className)}
        onClick={(event) => {
            if (onClick) {
                event.preventDefault();
                onClick(event);
            }
        }}
        {...props}>
        {children}
    </div>;
});

EntityPreviewContainer.displayName = "EntityPreviewContainer";
